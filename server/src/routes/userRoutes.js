import express from 'express';
const router = express.Router();
import userController from '../controllers/userController.js';
import { protect, adminOnly } from '../middleware/authMiddleware.js';
import { registerValidation, loginValidation, createUserValidation } from '../middleware/validators.js';
import upload from '../middleware/upload.js';

const {
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
} = userController;

router.post('/register', registerValidation, registerAdmin);
router.post('/login', loginValidation, loginUser);

router.route('/profile').get(protect, getProfile).put(protect, updateProfile);

router.route('/').get(protect, adminOnly, getUsers).post(protect, adminOnly, createUserValidation, createUser);

router
  .route('/:id')
  .get(protect, adminOnly, getUserById)
  .put(protect, adminOnly, updateUser)
  .delete(protect, adminOnly, deleteUser);

router.put('/:id/face', protect, adminOnly, enrollFace);
router.post('/:id/photo', protect, adminOnly, upload.single('photo'), uploadPhoto);

export default router;
