function rejectOtp(_req, res) {
  res.status(410).json({
    success: false,
    error: {
      code: 'BOOKING_OTP_DISABLED',
      message: '預約不使用簡訊驗證，請改以會員登入。若登入方式尚未設定，請聯絡店家。',
    },
  });
}

module.exports = {
  rejectOtp,
};
