const querystring = require("querystring");
const model = require('../models/Plato');

const create = (req, res) => {
    res.render('platos/create');
}

const store = (req,res) => {
    const { name } = req.body;
}

const index = async (req,res) => {
    try {
        const platos = await model.findAll()
        res.render('platos/index', { platos });
    } catch (error) {
        console.log(error);
        return res.status(500).send("Internal Server Error");
    }
}

// const show = (req,res) => {
//     fetch(" " + req.params.id)
//     .then((res) => res.join()
// .then((platos) => res.json(platos)));
// };

module.exports = {
    create,
    store,
    index,
    //show
}