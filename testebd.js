var sqlite3 = require('sqlite3').verbose();
var db = new sqlite3.Database('dsw.db');
var check;
db.serialize(function() {
/*
  db.run("CREATE TABLE if not exists user_info (info TEXT)");
  var stmt = db.prepare("INSERT INTO user_info VALUES (?)");
  for (var i = 0; i < 10; i++) {
      stmt.run("Ipsum " + i);
  }
  stmt.finalize();
*/
  db.each("SELECT id,nome FROM cat_musicas", function(err, row) {
      console.log(row.id + ": " + row.nome);
  });
});

db.close();