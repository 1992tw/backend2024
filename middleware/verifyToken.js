const jwt = require('jsonwebtoken');
const dotenv = require('dotenv');

dotenv.config();

const verifyToken = (req, res, next) => {
  const token = req.header('Authorization');

  // Check if the token is present and starts with 'Bearer '
  if (!token || !token.startsWith('Bearer ')) {
    return res.status(401).send('Access Denied');
  }

  // Extract the token by removing the 'Bearer ' prefix
  const actualToken = token.split(' ')[1];

  try {
    const verified = jwt.verify(actualToken, process.env.JWT_SECRET);
    req.user = verified;
    next();
  } catch (error) {
    res.status(400).send('Invalid Token');
  }
};

module.exports = verifyToken;
