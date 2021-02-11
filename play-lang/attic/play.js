function main() {
    debugger
    let name = "James";
    let age = 5;
    if (age > 3) {
        let bob = "hello";
        for (let i = 0; i < 10; i++) {
            console.log(bob);
        }
    }
    setName("Jerry");
    console.log(name, age);
    function setName(newName) {
        name = newName;
        console.log(name);
    }
    // initialize();
    // function initialize() {
    //     let age = 4;
    //     for (let i = 0; i < 1; i++) {
    //         let something = "blah";
    //         const input1 = document.createElement("input");
    //         input1.type = "text";
    //         const input2 = document.createElement("input");
    //         input1.type = "text";
    //         input1.addEventListener("keypress", (event) => {
    //             name = input1.value;
    //             console.log("age", age);
    //             console.log("something", something);
    //         });
    //         input2.addEventListener("keypress", (event) => {
    //             name = input2.value;
    //         });
    //         setInterval(() => console.log(name), 2000);
    //         document.body.appendChild(input1);
    //         document.body.appendChild(input2);
    //     }
    // }
}



main();
