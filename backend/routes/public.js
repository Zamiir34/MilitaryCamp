const express = require('express');
const router = express.Router();
const Personnel = require('../models/Personnel');
const Visitor = require('../models/Visitor');
const Vehicle = require('../models/Vehicle');

// Public identity verification route
router.get('/verify/:id', async (req, res) => {
  try {
    const { id } = req.params;
    
    // Check personnel first
    let subject = await Personnel.findOne({ personnelId: id });
    let type = 'Personnel';
    
    if (!subject) {
      subject = await Visitor.findOne({ visitorId: id });
      type = 'Visitor';
    }

    if (!subject) {
        subject = await Vehicle.findOne({ vehicleId: id });
        type = 'Vehicle';
    }
    
    if (!subject) {
      return res.status(404).json({ message: 'Identity not found in camp records.' });
    }
    
    const result = {
      fullName: subject.fullName || subject.plateNumber,
      rank: subject.rank || '',
      unit: subject.unit || subject.organization || subject.model || '',
      status: subject.status,
      photo: subject.photo,
      type: type,
      id: id,
      verifiedAt: new Date()
    };

    res.json(result);
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

module.exports = router;
