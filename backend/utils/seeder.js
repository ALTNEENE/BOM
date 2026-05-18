import mongoose from 'mongoose';
import dotenv from 'dotenv';
import bcrypt from 'bcryptjs';

import { User, Project, Task, Team } from '../models/index.js';
import connectDB from '../config/database.js';

dotenv.config();

// Sample users data
const users = [
  {
    firstName: 'Admin',
    lastName: 'User',
    email: 'admin@BOM Engineers.com',
    password: 'Admin@123',
    role: 'admin',
    isEmailVerified: true,
    department: 'Management',
    jobTitle: 'System Administrator',
  },
  {
    firstName: 'John',
    lastName: 'Doe',
    email: 'john@BOM Engineers.com',
    password: 'John@123',
    role: 'manager',
    isEmailVerified: true,
    department: 'Engineering',
    jobTitle: 'Engineering Manager',
  },
  {
    firstName: 'Jane',
    lastName: 'Smith',
    email: 'jane@BOM Engineers.com',
    password: 'Jane@123',
    role: 'user',
    isEmailVerified: true,
    department: 'Engineering',
    jobTitle: 'Senior Developer',
  },
  {
    firstName: 'Bob',
    lastName: 'Wilson',
    email: 'bob@BOM Engineers.com',
    password: 'Bob@1234',
    role: 'user',
    isEmailVerified: true,
    department: 'Design',
    jobTitle: 'UI/UX Designer',
  },
  {
    firstName: 'Alice',
    lastName: 'Johnson',
    email: 'alice@BOM Engineers.com',
    password: 'Alice@123',
    role: 'user',
    isEmailVerified: true,
    department: 'Marketing',
    jobTitle: 'Marketing Specialist',
  },
];

// Sample projects data
const createProjects = (userIds) => [
  {
    name: 'Website Redesign',
    description: 'Complete overhaul of the company website with modern design and improved UX',
    status: 'active',
    priority: 'high',
    owner: userIds[1], // John
    members: [
      { user: userIds[2], role: 'lead' },  // Jane
      { user: userIds[3], role: 'member' }, // Bob
    ],
    startDate: new Date(),
    dueDate: new Date(Date.now() + 90 * 24 * 60 * 60 * 1000),
    color: '#3B82F6',
    tags: ['frontend', 'design', 'ux'],
    visibility: 'team',
  },
  {
    name: 'Mobile App Development',
    description: 'Build a native mobile application for iOS and Android platforms',
    status: 'planning',
    priority: 'critical',
    owner: userIds[1], // John
    members: [
      { user: userIds[2], role: 'member' }, // Jane
    ],
    startDate: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000),
    dueDate: new Date(Date.now() + 180 * 24 * 60 * 60 * 1000),
    color: '#10B981',
    tags: ['mobile', 'react-native', 'api'],
    visibility: 'team',
  },
  {
    name: 'Q1 Marketing Campaign',
    description: 'Plan and execute marketing campaigns for Q1 2025',
    status: 'active',
    priority: 'medium',
    owner: userIds[4], // Alice
    members: [
      { user: userIds[3], role: 'member' }, // Bob
    ],
    startDate: new Date(),
    dueDate: new Date(Date.now() + 60 * 24 * 60 * 60 * 1000),
    color: '#F59E0B',
    tags: ['marketing', 'social-media', 'content'],
    visibility: 'team',
  },
];

// Sample tasks data
const createTasks = (projectIds, userIds) => [
  // Website Redesign tasks
  {
    title: 'Design new homepage mockup',
    description: 'Create wireframes and high-fidelity mockups for the new homepage',
    project: projectIds[0],
    status: 'in-progress',
    priority: 'high',
    assignee: userIds[3], // Bob
    reporter: userIds[1], // John
    dueDate: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000),
    estimatedHours: 16,
    tags: ['design', 'homepage'],
    checklist: [
      { text: 'Research competitor websites', isCompleted: true },
      { text: 'Create wireframes', isCompleted: true },
      { text: 'Design desktop version', isCompleted: false },
      { text: 'Design mobile version', isCompleted: false },
    ],
  },
  {
    title: 'Implement responsive navigation',
    description: 'Build the main navigation component with mobile menu',
    project: projectIds[0],
    status: 'todo',
    priority: 'high',
    assignee: userIds[2], // Jane
    reporter: userIds[1], // John
    dueDate: new Date(Date.now() + 14 * 24 * 60 * 60 * 1000),
    estimatedHours: 8,
    tags: ['frontend', 'component'],
  },
  {
    title: 'Set up CI/CD pipeline',
    description: 'Configure automated testing and deployment pipeline',
    project: projectIds[0],
    status: 'completed',
    priority: 'medium',
    assignee: userIds[2], // Jane
    reporter: userIds[1], // John
    dueDate: new Date(Date.now() - 7 * 24 * 60 * 60 * 1000),
    completedAt: new Date(Date.now() - 2 * 24 * 60 * 60 * 1000),
    estimatedHours: 4,
    actualHours: 5,
    tags: ['devops', 'automation'],
  },
  // Mobile App tasks
  {
    title: 'Define app architecture',
    description: 'Document the technical architecture and stack decisions',
    project: projectIds[1],
    status: 'review',
    priority: 'critical',
    assignee: userIds[2], // Jane
    reporter: userIds[1], // John
    dueDate: new Date(Date.now() + 3 * 24 * 60 * 60 * 1000),
    estimatedHours: 8,
    tags: ['architecture', 'documentation'],
  },
  {
    title: 'Set up React Native project',
    description: 'Initialize the React Native project with necessary dependencies',
    project: projectIds[1],
    status: 'todo',
    priority: 'high',
    assignee: userIds[2], // Jane
    reporter: userIds[1], // John
    dueDate: new Date(Date.now() + 10 * 24 * 60 * 60 * 1000),
    estimatedHours: 4,
    tags: ['setup', 'react-native'],
  },
  // Marketing Campaign tasks
  {
    title: 'Create social media content calendar',
    description: 'Plan content for all social media channels for Q1',
    project: projectIds[2],
    status: 'in-progress',
    priority: 'medium',
    assignee: userIds[4], // Alice
    reporter: userIds[4], // Alice
    dueDate: new Date(Date.now() + 5 * 24 * 60 * 60 * 1000),
    estimatedHours: 12,
    tags: ['social-media', 'planning'],
  },
  {
    title: 'Design campaign graphics',
    description: 'Create visual assets for the Q1 marketing campaign',
    project: projectIds[2],
    status: 'todo',
    priority: 'medium',
    assignee: userIds[3], // Bob
    reporter: userIds[4], // Alice
    dueDate: new Date(Date.now() + 14 * 24 * 60 * 60 * 1000),
    estimatedHours: 20,
    tags: ['design', 'graphics'],
  },
];

// Sample team data
const createTeams = (userIds) => [
  {
    name: 'Engineering Team',
    description: 'Software development and engineering department',
    owner: userIds[1], // John
    members: [
      { user: userIds[2], role: 'member' }, // Jane
    ],
    color: '#3B82F6',
    settings: {
      isPublic: false,
      allowMemberInvites: true,
    },
  },
  {
    name: 'Design Team',
    description: 'UI/UX and graphic design team',
    owner: userIds[3], // Bob
    members: [],
    color: '#EC4899',
    settings: {
      isPublic: false,
      allowMemberInvites: true,
    },
  },
];

// Seed database
const seedDatabase = async () => {
  try {
    await connectDB();
    console.log('🌱 Starting database seeding...\n');

    // Clear existing data
    console.log('🗑️  Clearing existing data...');
    await User.deleteMany({});
    await Project.deleteMany({});
    await Task.deleteMany({});
    await Team.deleteMany({});
    console.log('✓ Cleared existing data\n');

    // Create users
    console.log('👥 Creating users...');
    const createdUsers = await User.create(users);
    const userIds = createdUsers.map((u) => u._id);
    console.log(`✓ Created ${createdUsers.length} users\n`);

    // Create teams
    console.log('👥 Creating teams...');
    const teamsData = createTeams(userIds);
    const createdTeams = await Team.create(teamsData);
    console.log(`✓ Created ${createdTeams.length} teams\n`);

    // Create projects
    console.log('📁 Creating projects...');
    const projectsData = createProjects(userIds);
    const createdProjects = await Project.create(projectsData);
    const projectIds = createdProjects.map((p) => p._id);
    console.log(`✓ Created ${createdProjects.length} projects\n`);

    // Create tasks
    console.log('✅ Creating tasks...');
    const tasksData = createTasks(projectIds, userIds);
    const createdTasks = await Task.create(tasksData);
    console.log(`✓ Created ${createdTasks.length} tasks\n`);

    // Update project progress
    console.log('📊 Updating project progress...');
    for (const project of createdProjects) {
      const progress = await Project.calculateProgress(project._id);
      await Project.findByIdAndUpdate(project._id, { progress });
    }
    console.log('✓ Updated project progress\n');

    // Summary
    console.log('═══════════════════════════════════════════');
    console.log('           DATABASE SEEDED SUCCESSFULLY     ');
    console.log('═══════════════════════════════════════════\n');
    console.log('📊 Summary:');
    console.log(`   • Users: ${createdUsers.length}`);
    console.log(`   • Teams: ${createdTeams.length}`);
    console.log(`   • Projects: ${createdProjects.length}`);
    console.log(`   • Tasks: ${createdTasks.length}`);
    console.log('\n🔐 Test Accounts:');
    console.log('   Admin:   admin@BOM Engineers.com / Admin@123');
    console.log('   Manager: john@BOM Engineers.com / John@123');
    console.log('   User:    jane@BOM Engineers.com / Jane@123');
    console.log('═══════════════════════════════════════════\n');

    process.exit(0);
  } catch (error) {
    console.error('❌ Error seeding database:', error);
    process.exit(1);
  }
};

// Delete all data
const deleteData = async () => {
  try {
    await connectDB();
    console.log('🗑️  Deleting all data...\n');

    await User.deleteMany({});
    await Project.deleteMany({});
    await Task.deleteMany({});
    await Team.deleteMany({});

    console.log('✓ All data deleted successfully\n');
    process.exit(0);
  } catch (error) {
    console.error('❌ Error deleting data:', error);
    process.exit(1);
  }
};

// Command line arguments
if (process.argv[2] === '-d' || process.argv[2] === '--delete') {
  deleteData();
} else {
  seedDatabase();
}
