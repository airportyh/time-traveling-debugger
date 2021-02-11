const leveldown = require("leveldown");

const db = leveldown("ex/tic-tac-toe-speed-test.history");
db.open((error) => {
    const it = db.iterator();
    next();
    function next() {
        it.next((error, key, value) => {
            if (!error && !key) {
                return;
            }
            console.log(key.toString(), ":", value.toString());
            next();
        });
    }
});