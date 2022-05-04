const mongoose = require('mongoose');
const Schema = mongoose.Schema;

const NotebookSchema = new Schema({
    title: String,
    note: String,
    views: String,
    reviews: [
        {
            type: Schema.Types.ObjectId,
            ref: 'Review'
        }
    ],
    author:
    {
        type: Schema.Types.ObjectId,
        ref: 'User'
    }

});


const Notebook = mongoose.model('Notebook', NotebookSchema);
module.exports = Notebook; 