
const db = require('./db');

const getUserByEmail = async (email) => {
    const [rows] = await db.promise().query('SELECT * FROM users WHERE email = ?', [email]);
    return rows[0];
};

const createUser = async (userData) => {
    const {
        email, password, firstname, lastname,
        birthdate, gender, institution, field
    } = userData;

    const insertQuery = `
        INSERT INTO users (email, password, firstname, lastname, birthdate, gender, institution, field)
        VALUES (?, ?, ?, ?, ?, ?, ?, ?)
    `;

    await db.promise().query(insertQuery, [
        email, password, firstname, lastname, birthdate, gender, institution, field
    ]);
};

module.exports = {
    getUserByEmail,
    createUser
};
