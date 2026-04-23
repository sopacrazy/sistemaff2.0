const bcrypt = require("bcrypt");

const saltRounds = 10;
const plainPassword = "123456";

bcrypt.hash(plainPassword, saltRounds, (err, hash) => {
  if (err) {
    console.error("Erro ao gerar hash:", err);
  } else {
    console.log("Senha hasheada:", hash);
  }
});
