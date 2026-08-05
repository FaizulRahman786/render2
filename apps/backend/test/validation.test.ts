import { describe, it, expect } from 'vitest';
import express from 'express';
import request from 'supertest';
import { validate } from '../src/middleware/validation.js';
import {
  createStudentSchema,
  updateStudentSchema,
  createTeacherSchema,
  createBatchSchema,
  createTestSchema,
  gradeAssignmentSchema,
  sendNotificationSchema,
} from '../src/validation/schemas.js';

function mount(schema: Parameters<typeof validate>[0]) {
  const app = express();
  app.use(express.json());
  const handler = validate(schema);
  app.post('/x', handler, (_req, res) => res.json({ success: true }));
  app.post('/x/:id', handler, (_req, res) => res.json({ success: true }));
  app.post('/x/:id/:submissionId', handler, (_req, res) => res.json({ success: true }));
  app.use((_req, res) => res.status(400).json({ success: false, error: 'Validation failed', details: [] }));
  return app;
}

function expect400(res: request.Response, keyword: string) {
  expect(res.status).toBe(400);
  expect(res.body.success).toBe(false);
  expect(res.body.error).toBe('Validation failed');
  expect(JSON.stringify(res.body.details)).toMatch(keyword);
}

describe('validate() middleware', () => {
  it('passes a valid student payload', async () => {
    const app = mount(createStudentSchema);
    const res = await request(app).post('/x').send({
      name: 'Alice',
      email: 'alice@example.com',
      phone: '+919999999999',
      password: 'S3cretPass!',
      courseId: '6e0b2b4e-1a2b-4c3d-9e8f-0a1b2c3d4e5f',
    });
    expect(res.status).toBe(200);
    expect(res.body.success).toBe(true);
  });

  it('rejects a student payload missing required fields', async () => {
    const app = mount(createStudentSchema);
    const res = await request(app).post('/x').send({ name: 'Alice' });
    expect400(res, 'email is required');
    expect400(res, 'phone is required');
  });

  it('rejects role smuggling on student creation (privilege escalation guard)', async () => {
    const app = mount(createStudentSchema);
    const res = await request(app).post('/x').send({
      name: 'Alice',
      email: 'alice@example.com',
      phone: '+919999999999',
      role: 'admin',
    });
    expect(res.status).toBe(400);
    expect(JSON.stringify(res.body.details)).toContain('role cannot be set');
  });

  it('rejects malformed email and non-UUID courseId', async () => {
    const app = mount(createStudentSchema);
    const res = await request(app).post('/x').send({
      name: 'Alice',
      email: 'not-an-email',
      phone: '+919999999999',
      courseId: 'not-a-uuid',
    });
    expect400(res, 'email must be valid');
    expect400(res, 'must be a valid UUID');
  });

  it('rejects student/teacher creation without a password (email+password only)', async () => {
    const student = mount(createStudentSchema);
    const sRes = await request(student).post('/x').send({
      name: 'Alice',
      email: 'alice@example.com',
      phone: '+919999999999',
    });
    expect400(sRes, 'password is required');

    const teacher = mount(createTeacherSchema);
    const tRes = await request(teacher).post('/x').send({
      name: 'Prof B',
      email: 'b@example.com',
      phone: '+919888888888',
    });
    expect400(tRes, 'password is required');
  });

  it('rejects a password shorter than 8 characters on creation', async () => {
    const app = mount(createStudentSchema);
    const res = await request(app).post('/x').send({
      name: 'Alice',
      email: 'alice@example.com',
      phone: '+919999999999',
      password: 'short',
    });
    expect400(res, 'password');
  });

  it('accepts a valid student payload with a password', async () => {
    const app = mount(createStudentSchema);
    const res = await request(app).post('/x').send({
      name: 'Alice',
      email: 'alice@example.com',
      phone: '+919999999999',
      password: 'S3cretPass!',
    });
    expect(res.status).toBe(200);
  });

  it('validates the :id path parameter on update schemas', async () => {
    const app = mount(updateStudentSchema);
    const res = await request(app).post('/x/not-a-uuid').send({ name: 'Bob' });
    expect400(res, 'must be a valid UUID');
  });

  it('rejects role on teacher creation too', async () => {
    const app = mount(createTeacherSchema);
    const res = await request(app).post('/x').send({
      name: 'Prof B',
      email: 'b@example.com',
      phone: '+919888888888',
      role: 'admin',
    });
    expect400(res, 'role cannot be set');
  });

  it('accepts an empty grade feedback when grading a submission', async () => {
    const app = mount(gradeAssignmentSchema);
    const res = await request(app)
      .post('/x/6e0b2b4e-1a2b-4c3d-9e8f-0a1b2c3d4e5f/6e0b2b4e-1a2b-4c3d-9e8f-0a1b2c3d4e5f')
      .send({ marksAwarded: 7, feedback: '' });
    expect(res.status).toBe(200);
  });

  it('rejects negative marks when grading', async () => {
    const app = mount(gradeAssignmentSchema);
    const res = await request(app)
      .post('/x/6e0b2b4e-1a2b-4c3d-9e8f-0a1b2c3d4e5f/6e0b2b4e-1a2b-4c3d-9e8f-0a1b2c3d4e5f')
      .send({ marksAwarded: -1 });
    expect400(res, 'marksAwarded');
  });

  it('validates notification enum + receivers', async () => {
    const app = mount(sendNotificationSchema);
    const res = await request(app).post('/x').send({
      receiverIds: ['6e0b2b4e-1a2b-4c3d-9e8f-0a1b2c3d4e5f'],
      title: 'Hello',
      message: 'World',
      type: 'not-a-real-type',
    });
    expect400(res, 'must be one of');
  });

  it('rejects notification send without receiverIds', async () => {
    const app = mount(sendNotificationSchema);
    const res = await request(app).post('/x').send({ title: 'Hello', message: 'World' });
    expect400(res, 'receiverIds');
  });

  it('rejects notification send with empty receiverIds array', async () => {
    const app = mount(sendNotificationSchema);
    const res = await request(app).post('/x').send({ receiverIds: [], title: 'Hello', message: 'World' });
    expect400(res, 'receiverIds');
  });

  it('rejects non-UUID receiverIds', async () => {
    const app = mount(sendNotificationSchema);
    const res = await request(app).post('/x').send({
      receiverIds: ['not-a-uuid'],
      title: 'Hello',
      message: 'World',
    });
    expect400(res, 'valid UUID');
  });

  it('accepts a valid notification send payload', async () => {
    const app = mount(sendNotificationSchema);
    const res = await request(app).post('/x').send({
      receiverIds: ['6e0b2b4e-1a2b-4c3d-9e8f-0a1b2c3d4e5f'],
      title: 'Hello',
      message: 'World',
      type: 'announcement',
    });
    expect(res.status).toBe(200);
  });

  it('requires a batch name on createBatchSchema', async () => {
    const app = mount(createBatchSchema);
    const res = await request(app).post('/x').send({ name: '' });
    expect400(res, 'name is required');
  });

  it('rejects non-numeric duration on createTestSchema', async () => {
    const app = mount(createTestSchema);
    const res = await request(app).post('/x').send({
      title: 'Test',
      duration: 'two hours',
    });
    expect400(res, 'duration');
  });
});