const nodemailer = require('nodemailer');

const mailSender = async (email, title, body) => {
    try {
        let transporter = nodemailer.createTransport({
            host: process.env.MAIL_HOST,
            // service: 'Gmail',
            auth: {
                user: process.env.MAIL_ID,
                pass: process.env.MAIL_PASS,
            },
        })
        let info=await transporter.sendMail({
            from:`cs.studynotion@gmail.com`,
            to:`${email}`,
            subject:`${title}`,
            html:`${body}`,
        })
        
        return info;

    } catch (error) {
        console.log(error.message)
    }
}

module.exports = mailSender;