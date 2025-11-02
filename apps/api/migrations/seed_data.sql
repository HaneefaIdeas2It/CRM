-- Seed data for CRM system
-- This creates demo organization, users, pipeline, and sample customer

-- Create demo organization
INSERT INTO organizations (id, name, settings, "subscriptionTier", "maxUsers", "createdAt", "updatedAt")
VALUES (
    gen_random_uuid(),
    'Demo Organization',
    '{}'::jsonb,
    'ENTERPRISE',
    100,
    NOW(),
    NOW()
);

-- Get organization ID and create users using a DO block
DO $$
DECLARE
    org_id UUID;
    admin_id UUID := gen_random_uuid();
    manager_id UUID := gen_random_uuid();
    pipeline_id UUID := gen_random_uuid();
    customer_id UUID := gen_random_uuid();
BEGIN
    -- Get organization ID
    SELECT id INTO org_id FROM organizations WHERE name = 'Demo Organization' LIMIT 1;
    
    -- Create admin user (password: Admin123!@#$)
    -- Hashed with bcrypt, 12 rounds: $2a$12$LQv3c1yqBWVHxkd0LHAkCOYz6TtxMQJqhN8/LewY5LS2QoF9R1qkC
    INSERT INTO users (id, email, "passwordHash", "firstName", "lastName", role, "organizationId", "isActive", "createdAt", "updatedAt")
    VALUES (
        admin_id,
        'admin@demo.com',
        '$2a$12$LQv3c1yqBWVHxkd0LHAkCOYz6TtxMQJqhN8/LewY5LS2QoF9R1qkC',
        'Admin',
        'User',
        'ADMIN',
        org_id,
        true,
        NOW(),
        NOW()
    );
    
    -- Create manager user (password: Admin123!@#$)
    INSERT INTO users (id, email, "passwordHash", "firstName", "lastName", role, "organizationId", "isActive", "createdAt", "updatedAt")
    VALUES (
        manager_id,
        'manager@demo.com',
        '$2a$12$LQv3c1yqBWVHxkd0LHAkCOYz6TtxMQJqhN8/LewY5LS2QoF9R1qkC',
        'Manager',
        'User',
        'MANAGER',
        org_id,
        true,
        NOW(),
        NOW()
    );
    
    -- Create default pipeline
    INSERT INTO pipelines (id, name, stages, "isDefault", "createdAt", "updatedAt", "createdBy", "organizationId")
    VALUES (
        pipeline_id,
        'Default Sales Pipeline',
        '[
            {"id": "1", "name": "Lead", "order": 1, "probability": 10},
            {"id": "2", "name": "Qualified", "order": 2, "probability": 30},
            {"id": "3", "name": "Proposal", "order": 3, "probability": 50},
            {"id": "4", "name": "Negotiation", "order": 4, "probability": 70},
            {"id": "5", "name": "Closed Won", "order": 5, "probability": 100},
            {"id": "6", "name": "Closed Lost", "order": 6, "probability": 0}
        ]'::jsonb,
        true,
        NOW(),
        NOW(),
        admin_id,
        org_id
    );
    
    -- Create sample customer
    INSERT INTO customers (id, "firstName", "lastName", email, phone, company, tags, "customFields", "createdAt", "updatedAt", "createdBy", "organizationId")
    VALUES (
        customer_id,
        'John',
        'Doe',
        'john.doe@example.com',
        '+1234567890',
        'Acme Corp',
        ARRAY['enterprise', 'priority'],
        '{}'::jsonb,
        NOW(),
        NOW(),
        admin_id,
        org_id
    );
    
    RAISE NOTICE 'Seeded database successfully!';
    RAISE NOTICE 'Login credentials:';
    RAISE NOTICE 'Admin: admin@demo.com / Admin123!@#$';
    RAISE NOTICE 'Manager: manager@demo.com / Admin123!@#$';
END $$;
