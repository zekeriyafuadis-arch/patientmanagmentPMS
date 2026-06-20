const AppointmentsService = require('../services/appointments.service');

function handleError(res, err, fallbackStatus = 500) {
  res.status(err.statusCode || fallbackStatus).json({ success: false, error: err.message });
}

class AppointmentsController {
  static async getAvailableSlots(req, res) {
    try {
      const data = await AppointmentsService.getAvailableSlots(req.query);
      res.json({ success: true, data });
    } catch (err) {
      handleError(res, err);
    }
  }

  static async getPendingConfirmations(req, res) {
    try {
      const data = await AppointmentsService.getPendingConfirmations(req.user);
      res.json({ success: true, data });
    } catch (err) {
      handleError(res, err);
    }
  }

  static async assign(req, res) {
    try {
      const data = await AppointmentsService.assign(req.user, req.body);
      res.status(201).json({ success: true, data });
    } catch (err) {
      handleError(res, err, 400);
    }
  }

  static async bulkAssign(req, res) {
    try {
      const data = await AppointmentsService.bulkAssign();
      res.json({ success: true, data });
    } catch (err) {
      handleError(res, err);
    }
  }

  static async list(req, res) {
    try {
      const data = await AppointmentsService.list(req.user, req.query);
      res.json({ success: true, data });
    } catch (err) {
      handleError(res, err);
    }
  }

  static async getById(req, res) {
    try {
      const data = await AppointmentsService.getById(req.user, req.params.id);
      res.json({ success: true, data });
    } catch (err) {
      handleError(res, err);
    }
  }

  static async create(req, res) {
    try {
      const data = await AppointmentsService.create(req.user, req.body);
      res.status(201).json({ success: true, data });
    } catch (err) {
      handleError(res, err, 400);
    }
  }

  static async update(req, res) {
    try {
      const data = await AppointmentsService.update(req.user, req.params.id, req.body);
      res.json({ success: true, data });
    } catch (err) {
      handleError(res, err);
    }
  }

  static async confirm(req, res) {
    try {
      const data = await AppointmentsService.confirm(req.user, req.params.id);
      res.json({ success: true, message: data.message });
    } catch (err) {
      handleError(res, err);
    }
  }

  static async decline(req, res) {
    try {
      const data = await AppointmentsService.decline(req.user, req.params.id);
      res.json({ success: true, message: data.message, reassign: data.reassign });
    } catch (err) {
      handleError(res, err);
    }
  }

  static async patchStatus(req, res) {
    try {
      await AppointmentsService.patchStatus(req.user, req.params.id, req.body.status);
      res.json({ success: true });
    } catch (err) {
      handleError(res, err);
    }
  }

  static async remove(req, res) {
    try {
      await AppointmentsService.remove(req.user, req.params.id);
      res.json({ success: true });
    } catch (err) {
      handleError(res, err);
    }
  }
}

module.exports = AppointmentsController;
