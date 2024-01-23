
const mongoose= require('mongoose')

const PaymentSchema=new mongoose.Schema({
    userId:{
        type:mongoose.Schema.Types.ObjectId,
        ref:'User'
    },
    orderId:{
        type:String,
    },
    amount:{
        type:Number,
    },
    status: {
		type: String,
		enum: ["Created","Failed", "Success"],
	},
	paidAt: {
		type:Date,
		default:Date.now
	},
})

module.exports=mongoose.model('PaymentHistory',PaymentSchema);

