const express = require("express")
const router = express.Router()

const { capturePayment, verifyPayment, sendPaymentSuccessMail, createPaymentHistory, getPaymentHistory } = require("../controllers/Payments")
const { auth, isStudent } = require("../middlewares/auth")

router.post("/capturePayment", auth, isStudent, capturePayment)
router.post("/verifyPayment",auth, isStudent, verifyPayment)
router.post("/createPaymentHistory", auth, isStudent,createPaymentHistory);
router.post("/sendPaymentSuccessEmail", auth, isStudent,sendPaymentSuccessMail);
router.get("/getPaymentHistory", auth, isStudent,getPaymentHistory);

module.exports = router