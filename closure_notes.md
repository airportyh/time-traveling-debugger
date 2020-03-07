Things to Do:

1. Use AST traversal to figure out which functions need closures from which functions,
plus the variable list
2. For functions whose variables are dependent on by inner functions, we need to:
    * allocate an aptly named closure ($<fun name>\_closure) (a dictionary) for storing variables with
    * add the closure created above to the $pushFrame call
3. For each inner function that depends on an outer closure:
    * add the list of closures we need to the $pushFrame call
4. For each variable access to a variable in a closure, call the $setHeapVariable or
$getHeapVariable functions in place of $setVariable or $getVariable


for each function, we come up with the closures it needs:

    [
        {
            funName: "initialUI",
            variables: ["label"]
        },
        {
            funName: "main",
            variables: ["counter"]
        }
    ]