
const db = require('./db');

// Function to retrieve a user by their email
const getUserByEmail = async (email) => {
    const [rows] = await db.promise().query('SELECT * FROM users WHERE email = ?', [email]);
    return rows[0];
};

// Function to create a new user in the database
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

// Exporting the functions for use in other parts of the application
module.exports = {
    getUserByEmail,
    createUser
};
