import jwt from 'jsonwebtoken';
import User from '../models/User.js';
import envConfig from '../config/envConfig.js';
import { DESCRIPTOR_LENGTH } from '../utils/faceMatch.js';

const generateToken = (id) => {
  return jwt.sign({ id }, envConfig.jwtSecret, {
    expiresIn: envConfig.jwtExpire,
  });
};

// @desc    Register an administrator account (gated by an admin invite code)
// @route   POST /api/users/register
// @access  Public
const registerAdmin = async (req, res) => {
  try {
    const { name, email, password, adminCode } = req.body;

    if (!adminCode || adminCode !== envConfig.adminSecret) {
      return res.status(403).json({ message: 'Invalid admin registration code' });
    }

    const userExists = await User.findOne({ email });
    if (userExists) {
      return res.status(400).json({ message: 'User already exists' });
    }

    const user = await User.create({
      name,
      email,
      password,
      role: 'admin',
    });

    res.status(201).json({
      ...user.toSafeObject(),
      token: generateToken(user._id),
    });
  } catch (error) {
    res.status(400).json({ message: error.message });
  }
};

// @desc    Login (admin or member)
// @route   POST /api/users/login
// @access  Public
const loginUser = async (req, res) => {
  try {
    const { email, password } = req.body;

    const user = await User.findOne({ email }).select('+password');
    if (!user || !(await user.matchPassword(password))) {
      return res.status(401).json({ message: 'Invalid email or password' });
    }

    if (user.status === 'inactive') {
      return res.status(403).json({ message: 'This account has been deactivated' });
    }

    res.json({
      ...user.toSafeObject(),
      token: generateToken(user._id),
    });
  } catch (error) {
    res.status(400).json({ message: error.message });
  }
};

// @desc    Get my profile
// @route   GET /api/users/profile
// @access  Private
const getProfile = async (req, res) => {
  try {
    const user = await User.findById(req.user._id);
    if (!user) {
      return res.status(404).json({ message: 'User not found' });
    }
    res.json(user.toSafeObject());
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

// @desc    Update my profile
// @route   PUT /api/users/profile
// @access  Private
const updateProfile = async (req, res) => {
  try {
    const user = await User.findById(req.user._id).select('+password');
    if (!user) {
      return res.status(404).json({ message: 'User not found' });
    }

    const { name, phone, department, password } = req.body;
    if (name) user.name = name;
    if (phone !== undefined) user.phone = phone;
    if (department !== undefined) user.department = department;
    if (password) user.password = password;

    const updated = await user.save();
    res.json({
      ...updated.toSafeObject(),
      token: generateToken(updated._id),
    });
  } catch (error) {
    res.status(400).json({ message: error.message });
  }
};

// @desc    List all members (students/employees)
// @route   GET /api/users
// @access  Private/Admin
const getUsers = async (req, res) => {
  try {
    const { role, department, search } = req.query;
    const filter = { role: { $ne: 'admin' } };

    if (role) filter.role = role;
    if (department) filter.department = department;
    if (search) {
      filter.$or = [
        { name: { $regex: search, $options: 'i' } },
        { email: { $regex: search, $options: 'i' } },
        { memberId: { $regex: search, $options: 'i' } },
      ];
    }

    const users = await User.find(filter).sort({ createdAt: -1 });
    res.json(users.map((user) => user.toSafeObject()));
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

// @desc    Create a student/employee account
// @route   POST /api/users
// @access  Private/Admin
const createUser = async (req, res) => {
  try {
    const { name, email, password, role, memberId, department, phone } = req.body;

    const userExists = await User.findOne({ email });
    if (userExists) {
      return res.status(400).json({ message: 'User already exists' });
    }

    const user = await User.create({
      name,
      email,
      password,
      role: role === 'student' ? 'student' : 'employee',
      memberId,
      department,
      phone,
      createdBy: req.user._id,
    });

    res.status(201).json(user.toSafeObject());
  } catch (error) {
    res.status(400).json({ message: error.message });
  }
};

// @desc    Get a single member
// @route   GET /api/users/:id
// @access  Private/Admin
const getUserById = async (req, res) => {
  try {
    const user = await User.findById(req.params.id);
    if (!user) {
      return res.status(404).json({ message: 'User not found' });
    }
    res.json(user.toSafeObject());
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

// @desc    Update a member
// @route   PUT /api/users/:id
// @access  Private/Admin
const updateUser = async (req, res) => {
  try {
    const user = await User.findById(req.params.id);
    if (!user) {
      return res.status(404).json({ message: 'User not found' });
    }

    const { name, email, memberId, department, phone, status, role } = req.body;
    if (name !== undefined) user.name = name;
    if (email !== undefined) user.email = email;
    if (memberId !== undefined) user.memberId = memberId;
    if (department !== undefined) user.department = department;
    if (phone !== undefined) user.phone = phone;
    if (status !== undefined) user.status = status;
    if (role === 'student' || role === 'employee') user.role = role;

    const updated = await user.save();
    res.json(updated.toSafeObject());
  } catch (error) {
    res.status(400).json({ message: error.message });
  }
};

// @desc    Delete a member
// @route   DELETE /api/users/:id
// @access  Private/Admin
const deleteUser = async (req, res) => {
  try {
    const user = await User.findByIdAndDelete(req.params.id);
    if (!user) {
      return res.status(404).json({ message: 'User not found' });
    }
    res.json({ message: 'User removed' });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

// @desc    Enroll / update a member's face descriptor
// @route   PUT /api/users/:id/face
// @access  Private/Admin
const enrollFace = async (req, res) => {
  try {
    const { descriptor, photoUrl } = req.body;

    if (!Array.isArray(descriptor) || descriptor.length !== DESCRIPTOR_LENGTH) {
      return res.status(400).json({ message: `descriptor must be an array of ${DESCRIPTOR_LENGTH} numbers` });
    }

    const user = await User.findById(req.params.id);
    if (!user) {
      return res.status(404).json({ message: 'User not found' });
    }

    user.faceDescriptor = descriptor;
    user.isFaceEnrolled = true;
    if (photoUrl) user.photoUrl = photoUrl;

    const updated = await user.save();
    res.json(updated.toSafeObject());
  } catch (error) {
    res.status(400).json({ message: error.message });
  }
};

// @desc    Upload a profile photo for a member
// @route   POST /api/users/:id/photo
// @access  Private/Admin
const uploadPhoto = async (req, res) => {
  try {
    if (!req.file) {
      return res.status(400).json({ message: 'No photo file uploaded' });
    }

    const user = await User.findById(req.params.id);
    if (!user) {
      return res.status(404).json({ message: 'User not found' });
    }

    user.photoUrl = `/uploads/avatars/${req.file.filename}`;
    const updated = await user.save();
    res.json(updated.toSafeObject());
  } catch (error) {
    res.status(400).json({ message: error.message });
  }
};

export default {
  registerAdmin,
  loginUser,
  getProfile,
  updateProfile,
  getUsers,
  createUser,
  getUserById,
  updateUser,
  deleteUser,
  enrollFace,
  uploadPhoto,
};
