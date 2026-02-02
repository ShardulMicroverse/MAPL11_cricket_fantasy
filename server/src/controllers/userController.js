const User = require('../models/User');
const ApiError = require('../utils/ApiError');

// @desc    Get user profile
// @route   GET /api/users/profile
const getProfile = async (req, res) => {
  res.json({
    success: true,
    data: req.user
  });
};

// @desc    Update user profile
// @route   PUT /api/users/profile
const updateProfile = async (req, res, next) => {
  try {
    const { displayName, avatar } = req.body;
    const updateFields = {};

    if (displayName) updateFields.displayName = displayName;
    if (avatar) updateFields.avatar = avatar;

    const user = await User.findByIdAndUpdate(
      req.user._id,
      updateFields,
      { new: true, runValidators: true }
    );

    res.json({
      success: true,
      data: user
    });
  } catch (error) {
    next(error);
  }
};

// @desc    Get user statistics
// @route   GET /api/users/stats
const getStats = async (req, res) => {
  res.json({
    success: true,
    data: {
      virtualPoints: req.user.virtualPoints,
      stats: req.user.stats
    }
  });
};

module.exports = {
  getProfile,
  updateProfile,
  getStats
};
