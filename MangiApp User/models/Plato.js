const model = require("./mysql");

const findAll = async () => {
    const sql = "SELECT * FROM item"

    try {
        const [rows] = await pool.query(sql)
        return rows;
    } catch (error) {
        throw error
    }
}

module.exports = {
    findAll
}