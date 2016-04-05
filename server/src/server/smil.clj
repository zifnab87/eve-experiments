(ns server.smil
  (:refer-clojure :exclude [read])
  (:require [server.db :as db]
            [clojure.string :as string]
            [clojure.tools.reader :as reader]
            [clojure.tools.reader.reader-types :as reader-types]))

(def REMOVE_FACT 5)

(defn read [str]
  (reader/read (reader-types/indexing-push-back-reader str)))

(defn syntax-error
  ([msg expr] (syntax-error msg expr nil))
  ([msg expr data]
   (let [{:keys [line column end-line end-column]} (meta expr)
         standard-data {:expr expr :line line :column column :end-line end-line :end-column end-column}]
   (ex-info msg (merge standard-data data)))))

(defn merge-state [a b]
  (if (sequential? a)
    (into a b)
    (if (map? a)
      (merge-with merge-state a b)
      b)))

(defn splat-map [m]
  (reduce-kv conj [] m))

;; Flatten vecs (multi-returns) in the given body
(defn congeal-body [body]
  (vec (reduce #(if (vector? %2)
             (into %1 %2)
             (conj %1 %2))
          []
          body)))

(defn as-query [expr]
  (if (and (seq? expr) (= (first expr) 'query))
    expr
    ('query
     ('= 'return expr))))

(defn assert-queries [body]
  (doseq [expr body]
    ;; @NOTE: Should this allow unions/chooses as well?
    (when (or (not (seq? expr)) (not (= (first expr) 'query)))
    (throw (syntax-error "All union/choose members must be queries" expr))))
  body)

;; :args - positional arguments
;; :kwargs - keyword arguments
;; :rest - remaining arguments
;; :optional - arguments which may not be specified
(def schemas {
              ;; Special forms
              'insert-fact! nil
              'fact nil
              'define! nil ; Special due to multiple aliases
              'query nil ; Special due to optional parameterization
              
              ;; Macros
              'remove-by-t! {:args [:tick]}
              'if {:args [:cond :then :else]}

              ;; native forms
              'insert-fact-btu! {:args [:entity :attribute :value :bag] :kwargs [:tick] :optional #{:bag :tick}} ; bag can be inferred in SMIR
              
              'union {:args [:params] :rest :members}
              'choose {:args [:params] :rest :members}
              'not {:args [:expr]}
              'fact-btu {:args [:entity :attribute :value :bag] :kwargs [:tick] :optional #{:entity :attribute :value :bag :tick}}
              'full-fact-btu {:args [:entity :attribute :value :bag] :kwargs [:tick] :optional #{:entity :attribute :value :bag :tick}}
              'context {:kwargs [:bag :tick] :rest :body :optional #{:bag :tick :body}}})

;; These are only needed for testing -- they'll be provided dynamically by the db at runtime
(def primitives {'+ {:args [:a :b]}
                 '- {:args [:a :b]}
                 '* {:args [:a :b]}
                 '/ {:args [:a :b]}
                 
                 '= {:args [:a :b]}
                 '!= {:args [:a :b]}
                 '> {:args [:a :b]}
                 '>= {:args [:a :b]}
                 '< {:args [:a :b]}
                 '<= {:args [:a :b]}})

(defn get-schema
  ([op] (or (op schemas) (op primitives)))
  ([db op]
   (let [schema (get-schema op)
         implication (when-not schema
                       (when db (db/implication-of db (name op))))]
     (if schema
       schema
       (when implication
         {:args (vec (map keyword (first implication)))})))))

;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;
;; Parse sexprs into argument hashmaps
;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;
(defn parse-schema [schema sexpr]
  ;; 1. If a keyword has been shifted into :kw
  ;;    A. If the value is also keyword, :kw is an implicit var binding
  ;;    B. Else :kw is mapped manually to the value
  ;; 2. If the value is a keyword, shift it into :kw and stop accepting positionals
  ;; 3. If we haven't exhausted our positionals, shift a positional to map to the value
  ;; 4. If the form accepts a rest parameter, shift the value onto the rest list
  (let [body (rest sexpr)
        state (reduce
               #(merge-state %1
                             (if (:kw %1) 
                               (if (keyword? %2)
                                 ;; Implicit variable; sub in a symbol of the same name, set the next :kw
                                 {:kw %2 :args {(:kw %1) (symbol (name (:kw %1)))}}
                                 ;; Normal KV pair; use the :kw
                                 {:kw nil :args {(:kw %1) %2}})
                               (if (keyword? %2)
                                 ;; Manual keyword, set the next :kw and cease being positional
                                 {:position 0 :kw %2}
                                 (if-let [kw (get (:args schema) (- (count (:args schema)) (:position %1)) nil)]
                                   ;; Positional value; use kw from (:args schema) and decrement (position
                                   {:position (dec (:position %1)) :args {kw %2}}
                                   (if (:rest schema)
                                     ;; If a rest argument is specified, dump excess args into it
                                     {:args {(:rest schema) [%2]}}
                                     ;; Too many arguments without names, bail
                                     (throw (syntax-error
                                             (str "Too many positional arguments without a rest argument. Expected " (count (:args schema)))
                                             sexpr)))))))
               {:args {} :kw nil :position (count (:args schema))} body)
        state (merge-state state (if (:kw state)
                                   {:kw nil :args {(:kw state) (symbol (name (:kw state)))}}
                                   nil))]
    (:args state)))

(defn parse-define [sexpr]
  ;; 1. If we've started parsing the body, everything else gets pushed into the body
  ;; 2. If there's an existing symbol in :sym (alias)
  ;;    A. If the value is a vec, shift the pair into the :header
  ;;    B. Throw (Aliases must be followed by their exported variables)
  ;; 3. If the value is a symbol, shift it into :sym
  ;; 4. Shift the value into the body
  (select-keys
   (reduce
    #(merge-state
      %1
      ;; If we've already entered the body, no more headers can follow
      (if (> (count (:body %1)) 0)
        {:body [%2]}
        ;; If we've already snatched an alias, it must be followed by a vec of vars
        (if (:sym %1)
          (if (vector? %2)
            {:sym nil :header [(:sym %1) %2]}
            (throw (syntax-error
                    (str "Implication alias " (:sym %1) " must be followed by a vec of exported variables")
                    sexpr)))
          ;; If our state is clear we can begin a new header (symbol) or enter the body (anything else)
          (if (symbol? %2)
            {:sym %2}
            ;; If no headers are defined before we try to enter the body, that's a paddlin'
            (if (> (count (:header %1)) 0)
              {:body [%2]}
              (throw (syntax-error "Implications must specify at least one alias" sexpr)))))))
    {:header [] :body [] :sym nil} (rest sexpr))
   [:header :body]))

(defn parse-query [sexpr]
  (let [body (rest sexpr)
        params (when (vector? (first body)) (first body))
        body (if params (rest body) body)]
    {:params params :body body}))

(defn parse-fact [sexpr]
  ;; 1. Shift the first expr into :entity
  ;; 2. If there's an existing value in :attr (attribute)
  ;;    A. If the value is also keyword, :attr is an implicit var binding
  ;;    B. Else shift :attr and the value into an [:entity :attr value] triple in :facts
  ;; 3. Shift the value into :attr
  (let [body (rest sexpr)
        state (reduce
               #(merge-state
                 %1
                 (if (:attr %1)
                   (if (keyword? %2)
                     ;; Implicit variable; sub in a symbol of the same name, set the next :attr
                     {:attr %2 :facts [[(:entity %1) (name (:attr %1)) (symbol (name (:attr %1)))]]}
                     ;; Normal KV pair; use the :attr
                     {:attr nil :facts [[(:entity %1) (name (:attr %1)) %2]]})
                   ;; Shift the next value into  :attr
                   (if (keyword? %2)
                     {:attr %2}
                     (throw (syntax-error
                             (str "Invalid attribute '" %2 "'. Attributes must be keyword literals. Use fact-btu for free attributes")
                             sexpr)))))
               {:entity (first body) :facts [] :attr nil}
               (rest body))
        state (merge-state state (if (:attr state)
                                   {:attr nil :facts [[(:entity state) (name (:attr state)) (symbol (name (:attr state)))]]}
                                   nil))
        state (merge-state state (if (= (count (:facts state)) 0)
                                   {:facts [[(:entity state)]]}
                                   nil))]
    state))

(defn parse-args
  ([sexpr] (parse-args [nil sexpr]))
  ([db sexpr]
   (let [op (first sexpr)
         body (rest sexpr)
         schema (get-schema db op)]
     (with-meta (cond
                  schema (parse-schema schema sexpr)
                  (= op 'define!) (parse-define sexpr)
                  (= op 'query) (parse-query sexpr)
                  (= op 'fact) (parse-fact sexpr)
                  (= op 'insert-fact!) (parse-fact sexpr)
                  :else (throw (syntax-error (str "Unknown operator " op) sexpr)))
       {:expr sexpr :schema schema}))))

(defn validate-args [args]
  (let [{:keys [schema expr]} (meta args)
        supplied? (set (keys args))
        optional? (:optional schema)
        params (into (:args schema) (:kwargs schema))
        params (if (:rest schema) (conj params (:rest schema)) params)
        param? (set params)
        required (if optional? (into [] (filter #(not (optional? %1)) params)) params)]
    (when schema
      (or (when param? (some #(when-not (param? %1)
                                (syntax-error (str "Invalid keyword argument " %1 " for " (first expr)) expr))
                             (keys args)))
          (some #(when-not (supplied? %1)
                   (syntax-error (str "Missing required argument " %1 " for " (first expr)) expr))
                required)))))

(defn assert-valid [args]
  (if-let [err (validate-args args)]
    (throw err)
    args))  

;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;
;; Expand a SMIL sexpr recursively until it's ready for WEASL compilation
;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;
(declare expand)
(defn expand-each [db args]
  (congeal-body (map #(expand db %1) args)))

(defn expand-values [db args]
  (reduce-kv (fn [memo k v]
               (assoc memo k (if (vector? v) (expand-each db v) (expand db v)))) {} args))

(defn expand [db expr]
  (cond
    (seq? expr)
    (let [sexpr expr
          op (first sexpr)
          body (rest sexpr)
          args (assert-valid (parse-args db sexpr))
          expanded (case op
                     ;; Special forms
                     query (concat [op (:params args)] (expand-each db (:body args)))
                     define! (with-meta (concat [op] (:header args) (expand-each db (:body args)))
                               args)
                     fact (expand-each db (map #(cons (with-meta 'fact-btu (meta op)) %1) (:facts args)))
                     insert-fact! (expand-each db (map #(cons (with-meta 'insert-fact-btu! (meta op)) %1) (:facts args)))
                     
                     ;; Macros
                     remove-by-t! (expand db (list (with-meta 'insert-fact-btu! (meta op)) (:tick args) REMOVE_FACT nil))
                     if (let [then (as-query (:then args))
                              then ('query (:cond args) (rest then))
                              else (as-query (:else args))]
                          ((with-meta 'choose (meta op)) ['return]
                           (expand db then)
                           (expand db else)))
                     
                     ;; Native forms
                     insert-fact-btu! (cons op (splat-map (expand-values db args)))
                     union (concat [op] [(:params args)] (assert-queries (expand-each db (:members args))))
                     choose (concat [op] [(:params args)] (assert-queries (expand-each db (:members args))))
                     not (cons op [(expand db (:expr args))])
                     context (cons op (splat-map (expand-values db args)))

                     ;; Default
                     (cons op (splat-map (expand-values db args))))]
      (with-meta expanded (merge (meta expr) (meta expanded))))
    (sequential? expr) (expand-each db expr)
    :else expr))
  
(defn returnable? [sexpr]
  ((set (keys primitives)) (first sexpr)))

(defn unpack-inline [sexpr]
  (cond
    (and (seq? sexpr) (#{'query 'define!} (first sexpr)))
    {:inline [(with-meta
               (concat
                [(first sexpr)]
                (reduce
                 #(let [{inline :inline query :query} (unpack-inline %2)]
                    (into (into %1 query) inline))
                 [] (rest sexpr)))
               (meta sexpr))]
     :query []}
    
    (and (seq? sexpr) (returnable? sexpr))
    (let [state (reduce
                 #(merge-state
                    %1
                    (if-not (seq? %2)
                      {:inline [%2]}
                      (let [{inline :inline query :query} (unpack-inline %2)]
                        (let [tmp (gensym "$$tmp")
                              query (conj query (concat (first inline) [:return tmp]))]
                          {:inline [tmp] :query query}))))
                 {:inline [] :query []}
                 (rest sexpr))]
      {:inline [(concat [(first sexpr)] (:inline state))] :query (:query state)})

    :else
    {:inline [sexpr]}))

(defn unpack [db sexpr]
  (first (:inline (unpack-inline (expand db sexpr)))))

;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;
;; SMIL formatting and debugging utilities
;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;
(defn print-indent
  ([indent] (print-indent indent 0))
  ([indent offset]
  (print (apply str (repeat (+ (* indent 2) offset) " ")))))

(defn print-expr [& args]
  (print (string/join
          " "
          (map #(condp (fn [x y] (= (type y) x)) %1
                  nil "nil"
                  java.lang.String (str "\"" %1 "\"")
                  (str %1))
               args))))

(defn print-smil [sexpr & {:keys [indent] :or {indent 0}}]
   (cond
     (not (seq? sexpr))
     (if (sequential? sexpr)
       (map #(print-smil %1 :indent indent) sexpr)
       (print-expr sexpr))

     (= 'query (first sexpr))
     (do
       (print-indent indent)
       (print "(")
       (print-expr (first sexpr) (second sexpr))
       (println)
       (doseq [child (drop 2 sexpr)]
         (print-smil child :indent (+ indent 1)))
       (print-indent indent)
       (println ")"))

     (= 'define! (first sexpr))
     (let [m (meta sexpr)
           header (partition 2 (:header m))
           pair (first header)
           skip (count (:header m))
           body (drop skip (rest sexpr))]
       (print-indent indent)
       (print "(")
       (print-expr (first sexpr) (first pair) (second pair))
       (println)
       (doseq [pair (rest header)]
         (print-indent indent 9)
         (print-expr (first pair) (second pair))
         (println))
       (doseq [child body]
         (print-smil child :indent (+ indent 1)))
       (print-indent indent)
       (println ")"))
     
     :else
     (do
       (print-indent indent)
       (print "(")
       (print-expr (first sexpr))
       (doseq [expr (rest sexpr)]
         (print " ")
         (print-smil expr :indent (+ indent 1)))
       (println ")"))
     ))

(defn test-sm
  ([sexpr] (test-sm nil sexpr))
  ([db sexpr]
  (println "----[" sexpr "]----")
  (let [op (first sexpr)
        body (rest sexpr)
        schema (get-schema db op)
        _ (println " - schema " schema)
        args (parse-args db sexpr)
        _ (println " - args " args)
        invalid (validate-args args)
        _ (println " - invalid " (when invalid {:message (.getMessage invalid) :data (ex-data invalid)}))
        expanded (expand db sexpr)
        _ (println " - expanded " expanded)
        unpacked (first (:inline (unpack-inline expanded)))
        _ (println " - unpacked " unpacked)
        ]
    (print-smil unpacked))))

;; Positive test cases
;; (test-sm '(define! foo [a b] (fact bar :age a) (fact a :tag bar)))
;; (test-sm '(query (insert-fact! a :b c :d 2 :e)))
;; (test-sm '(union [person] (query (not (fact-btu :value person)) (fact person :company "kodowa"))))
;; (test-sm '(choose [person] (query (fact person)) (query (fact other :friend person))))
;; (test-sm '(query (+ (/ 2 x) (- y 7))))

;; Negative test cases
;; (test-sm '(non-existent-foo))
;; (test-sm '(insert-fact! foo a 1 b))
;; (test-sm '(insert-fact-btu! e "attr"))
;; (test-sm '(fact-btu :non-existent foo))
;; (test-sm '(not foo bar))
;; (test-sm '(fact a b c))
;; (test-sm '(define! (fact a)))
;; (test-sm '(define! foo (fact a)))
;; (test-sm '(union [result] (fact a)))
