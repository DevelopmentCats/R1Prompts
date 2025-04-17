import { AppDataSource } from '../src/config/database';
import { User } from '../src/entities/User';
import { Encryption } from '../src/utils/encryption';
import bcrypt from 'bcryptjs';

async function createUser() {
  try {
    // Initialize the database connection
    await AppDataSource.initialize();
    
    const userRepository = AppDataSource.getRepository(User);
    
    // User details
    const username = 'Cat';
    const email = 'chris@dualriver.com';
    const password = 'Jennifer@97';
    const isAdmin = true;

    // Hash password
    const salt = await bcrypt.genSalt(10);
    const hashedPassword = await bcrypt.hash(password, salt);

    // Create user with encrypted email
    const encryptedEmail = `encrypted:${Encryption.handleEmail(email)}`;
    const user = userRepository.create({
      username,
      email: encryptedEmail,
      password: hashedPassword,
      isAdmin,
    });

    await userRepository.save(user);

    console.log('User created successfully!');
    console.log('Username:', username);
    console.log('Encrypted email:', encryptedEmail);
    process.exit(0);
  } catch (error) {
    console.error('Error creating user:', error);
    process.exit(1);
  }
}

createUser();
