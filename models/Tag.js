const monoose = require('mongoose');

const TagSchema = new monoose.Schema({
    name: {
        type: String,
        required: true,
    },
    description: {
        type: String,
    },
    course:{
        type:monoose.Schema.Types.ObjectId,
        ref:"Course",
    },
})

module.exports=monoose.model("Tag",TagSchema);