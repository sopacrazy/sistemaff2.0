// authMiddleware.js
const jwt = require("jsonwebtoken");

module.exports = (req, res, next) => {
  // Tenta pegar o token do header Authorization primeiro, depois da query string
  const authHeader = req.headers["authorization"];
  let token = authHeader && authHeader.split(" ")[1];
  
  if (!token && req.query.token) {
    token = req.query.token;
  }

  if (!token) {
    return res.status(401).json({ error: "Token não fornecido" });
  }

  jwt.verify(token, process.env.JWT_SECRET, (err, user) => {
    if (err) {
      return res.status(403).json({ error: "Token inválido ou expirado", details: err.message });
    }
    req.user = user;
    next();
  });
};
