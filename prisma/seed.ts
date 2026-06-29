import { PrismaClient } from '@prisma/client';
import * as bcrypt from 'bcryptjs';
import { RESOURCE } from '../src/common/constants/resource';
import { ACTIONS } from '../src/common/constants/actions';

const prisma = new PrismaClient();

async function main() {
  console.log('Seeding database...');

  // 1. Seed Permission Actions
  const actionKeys = Object.keys(ACTIONS) as Array<keyof typeof ACTIONS>;
  const actionsList = actionKeys.map(key => ACTIONS[key]);
  console.log(`Seeding ${actionsList.length} permission actions...`);
  
  const seededActions = [];
  for (const actionVal of actionsList) {
    const act = await prisma.permissionAction.upsert({
      where: { action: actionVal },
      update: {},
      create: {
        action: actionVal,
        description: `Permission to ${actionVal} resources`,
      },
    });
    seededActions.push(act);
  }

  // 2. Seed Permission Resources
  const resourceKeys = Object.keys(RESOURCE) as Array<keyof typeof RESOURCE>;
  const resourcesList = resourceKeys.map(key => RESOURCE[key]);
  console.log(`Seeding ${resourcesList.length} permission resources...`);

  const seededResources = [];
  for (const resourceVal of resourcesList) {
    const res = await prisma.permissionResource.upsert({
      where: { name: resourceVal },
      update: {},
      create: {
        name: resourceVal,
        description: `Resource for managing ${resourceVal}`,
      },
    });
    seededResources.push(res);
  }

  // 3. Seed Super Admin Role
  console.log('Seeding SuperAdmin role...');
  const superAdminRole = await prisma.role.upsert({
    where: { name: 'SuperAdmin' },
    update: {},
    create: {
      name: 'SuperAdmin',
      description: 'Super Administrator with access to all permissions and resources',
      switchable: false,
      editable: false,
    },
  });

  // 4. Link all resources and actions to SuperAdmin
  console.log('Linking all resources and actions to SuperAdmin role...');
  for (const resource of seededResources) {
    const rolePermissionResource = await prisma.rolePermissionResource.upsert({
      where: {
        permission_resource_id_role_id: {
          permission_resource_id: resource.id,
          role_id: superAdminRole.id,
        },
      },
      update: {},
      create: {
        role_id: superAdminRole.id,
        permission_resource_id: resource.id,
      },
    });

    for (const action of seededActions) {
      await prisma.rolePermissionResourceAction.upsert({
        where: {
          role_permission_resource_id_permission_action_id: {
            role_permission_resource_id: rolePermissionResource.id,
            permission_action_id: action.id,
          },
        },
        update: {},
        create: {
          role_permission_resource_id: rolePermissionResource.id,
          permission_action_id: action.id,
        },
      });
    }
  }

  // 5. Seed default Super Admin Employee
  console.log('Seeding default Super Admin employee...');
  const adminUsername = 'superadmin';
  const adminPassword = 'AdminPassword123!';
  const hashedPassword = await bcrypt.hash(adminPassword, 10);

  const superAdminEmployee = await prisma.employee.upsert({
    where: { username: adminUsername },
    update: {
      phone_number: '0930222784',
    },
    create: {
      name: 'Super Admin',
      username: adminUsername,
      password: hashedPassword,
      phone_number: '0930222784',
      email: 'admin@example.com',
      username_verified: true,
      username_verified_at: new Date(),
      is_active: true,
      require_password_change: false,
    },
  });

  // 6. Link employee to SuperAdmin role
  await prisma.employeeRole.upsert({
    where: {
      role_id_employee_id: {
        role_id: superAdminRole.id,
        employee_id: superAdminEmployee.id,
      },
    },
    update: {},
    create: {
      role_id: superAdminRole.id,
      employee_id: superAdminEmployee.id,
    },
  });

  // 7. Seed sample Event and Visit
  console.log('Seeding sample Event and Visit...');
  
  // Clear any existing sample event & visit entries to allow clean re-runs
  await prisma.eventAndVisit.deleteMany({
    where: {
      record_code: { in: ['EV-2026-0001', 'EV-2026-0002'] }
    }
  });

  await prisma.eventAndVisit.create({
    data: {
      record_code: 'EV-2026-0001',
      main_type: 'EVENT',
      event_name: 'PMIS Launch Conference',
      event_type: 'CONFERENCE',
      event_category: 'INTERNAL',
      event_date: new Date('2026-07-15T09:00:00Z'),
      venue: 'Main Hall, EAII',
      organizer: 'EAII ICT',
      event_mode: 'PHYSICAL',
      estimated_budget: 15000.00,
      actual_budget: 14200.00,
      funding_source: 'Internal Budget',
      key_discussions: 'Discussion on system rollout and onboarding of divisions.',
      status: 'APPROVED',
      created_by_id: superAdminEmployee.id,
      approved_by_id: superAdminEmployee.id,
      participants: {
        create: [
          {
            role: 'EAII_PARTICIPANT',
            full_name: 'Dr. Solomon',
            division: 'Research & Development',
            position: 'Lead Scientist',
          },
          {
            role: 'PARTNER_PARTICIPANT',
            full_name: 'Alice Johnson',
            organization_name: 'UNDP',
            position: 'Tech advisor',
            email: 'alice.johnson@undp.org',
          }
        ]
      },
      documents: {
        create: [
          {
            attachment_type: 'AGENDA',
            file_name: 'agenda.pdf',
            file_url: 'https://example.com/agenda.pdf',
            uploaded_by_id: superAdminEmployee.id,
          }
        ]
      }
    }
  });

  await prisma.eventAndVisit.create({
    data: {
      record_code: 'EV-2026-0002',
      main_type: 'VISIT',
      visit_type: 'INCOMING_VISIT',
      visit_category: 'INTERNATIONAL',
      visit_date: new Date('2026-08-10T10:00:00Z'),
      host_organization: 'EAII',
      visiting_organization: 'MIT Research Lab',
      visit_location: 'EAII Campus',
      purpose_of_visit: 'RESEARCH_COLLABORATION',
      focal_person_name: 'Dr. Solomon',
      focal_person_division: 'Research & Development',
      focal_person_email: 'solomon@eaii.org',
      status: 'DRAFT',
      created_by_id: superAdminEmployee.id,
      participants: {
        create: [
          {
            role: 'DELEGATE',
            full_name: 'Prof. John Connor',
            organization_name: 'MIT',
            position: 'Director of AI Lab',
            country: 'USA',
          }
        ]
      }
    }
  });

  console.log('\nSeeding completed successfully!');
  console.log('--------------------------------------------------');
  console.log(`Default Super Admin Credentials:`);
  console.log(`Username: ${adminUsername}`);
  console.log(`Password: ${adminPassword}`);
  console.log(`Phone:    0930222784`);
  console.log('--------------------------------------------------');
}

main()
  .catch((e) => {
    console.error('Error during seeding:', e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
