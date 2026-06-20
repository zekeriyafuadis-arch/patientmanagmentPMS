const AuthService = require('../services/auth.service');

class AuthController {
  static async login(req, res) {
    try {
      const data = await AuthService.login(req.body.email, req.body.password, req);
      res.json({ success: true, ...data });
    } catch (err) {
      res.status(err.status || 500).json({
        success: false,
        error: err.message,
        code: err.code || undefined
      });
    }
  }

  static async me(req, res) {
    try {
      const user = await AuthService.getMe(req.user.id);
      res.json({ success: true, user });
    } catch (err) {
      res.status(err.status || 500).json({
        success: false,
        error: err.message,
        code: err.code || undefined
      });
    }
  }

  static async changePassword(req, res) {
    try {
      const { currentPassword, newPassword } = req.body;
      await AuthService.changePassword(req.user.id, currentPassword, newPassword, req);
      res.json({ success: true });
    } catch (err) {
      res.status(err.status || 500).json({
        success: false,
        error: err.message,
        code: err.code || undefined
      });
    }
  }

  static config(req, res) {
    res.json({ success: true, ...AuthService.getPublicConfig() });
  }
}

module.exports = AuthController;
