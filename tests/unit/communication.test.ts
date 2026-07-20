import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import test from "node:test";

process.env.NODE_ENV = "test";
process.env.JWT_SECRET =
  process.env.JWT_SECRET || "communication-test-secret-with-enough-length";
process.env.DATABASE_URL =
  process.env.DATABASE_URL || "postgresql://test:test@localhost:5432/test_db";
process.env.DATABASE_URL_UNPOOLED =
  process.env.DATABASE_URL_UNPOOLED || process.env.DATABASE_URL;

test("communication delivery IDs are stable UUIDs", async () => {
  const { createDeterministicCommunicationId } = await import("../../server/communication");
  const first = createDeterministicCommunicationId("payment-receipt", 42, "email");
  const repeated = createDeterministicCommunicationId("payment-receipt", 42, "email");
  const different = createDeterministicCommunicationId("payment-receipt", 43, "email");

  assert.match(first, /^[0-9a-f]{8}-[0-9a-f]{4}-5[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/);
  assert.equal(repeated, first);
  assert.notEqual(different, first);
});

test("communication event dispatch generates documents and audit records", async () => {
  const { storage } = await import("../../server/storage");
  const originalLogAnalytics = storage.logAnalytics.bind(storage);
  const originalCreateCommunicationEvent = storage.createCommunicationEvent.bind(storage);
  const originalUpdateCommunicationEventStatus = storage.updateCommunicationEventStatus.bind(storage);
  const originalGetCommunicationEvent = storage.getCommunicationEvent.bind(storage);
  const originalCreateCommunicationMessage = storage.createCommunicationMessage.bind(storage);
  const originalGetCommunicationMessages = storage.getCommunicationMessages.bind(storage);
  const originalCreateNotification = storage.createNotification.bind(storage);
  const originalCreateCommunicationDocument = storage.createCommunicationDocument.bind(storage);
  const originalGetCommunicationDocuments = storage.getCommunicationDocuments.bind(storage);
  const originalCreateCommunicationWorkflowTask = storage.createCommunicationWorkflowTask.bind(storage);
  const originalGetCommunicationWorkflowTasks = storage.getCommunicationWorkflowTasks.bind(storage);
  const originalUpdateCommunicationWorkflowTaskStatus = storage.updateCommunicationWorkflowTaskStatus.bind(storage);
  const originalCreateCommunicationTemplateVersion = storage.createCommunicationTemplateVersion.bind(storage);
  const originalGetCommunicationTemplateVersions = storage.getCommunicationTemplateVersions.bind(storage);
  const originalGetCommunicationTemplateVersionsByTemplateId = storage.getCommunicationTemplateVersionsByTemplateId.bind(storage);
  const analyticsEvents: any[] = [];
  const communicationEvents: any[] = [];
  const communicationMessages: any[] = [];
  const notifications: any[] = [];
  const communicationDocuments: any[] = [];
  const workflowTasks: any[] = [];
  const templateVersions: any[] = [];
  storage.logAnalytics = async (event: any) => {
    analyticsEvents.push(event);
    return {
      id: analyticsEvents.length,
      ...event,
      timestamp: new Date(),
    };
  };
  storage.createCommunicationEvent = async (event: any) => {
    communicationEvents.push(event);
    return {
      ...event,
      createdAt: new Date(),
      updatedAt: new Date(),
      processedAt: null,
      lastError: null,
    };
  };
  storage.updateCommunicationEventStatus = async (id: string, status: string) => {
    const event = communicationEvents.find((item) => item.id === id);
    if (event) event.status = status;
    return event;
  };
  storage.getCommunicationEvent = async (id: string) => communicationEvents.find((item) => item.id === id);
  storage.createCommunicationMessage = async (message: any) => {
    const saved = {
      ...message,
      createdAt: new Date(),
      updatedAt: new Date(),
    };
    communicationMessages.push(saved);
    return saved;
  };
  storage.getCommunicationMessages = async (limit = 100) => communicationMessages.slice(-limit).reverse();
  storage.createNotification = async (notification: any) => {
    const saved = {
      id: notifications.length + 1,
      ...notification,
      createdAt: new Date(),
      readAt: null,
    };
    notifications.push(saved);
    return saved;
  };
  storage.createCommunicationDocument = async (document: any) => {
    const saved = {
      ...document,
      createdAt: new Date(),
      updatedAt: new Date(),
    };
    communicationDocuments.push(saved);
    return saved;
  };
  storage.getCommunicationDocuments = async (limit = 100) => communicationDocuments.slice(-limit).reverse();
  storage.createCommunicationWorkflowTask = async (task: any) => {
    const saved = {
      ...task,
      createdAt: new Date(),
      updatedAt: new Date(),
    };
    workflowTasks.push(saved);
    return saved;
  };
  storage.getCommunicationWorkflowTasks = async (limit = 100) => workflowTasks.slice(-limit).reverse();
  storage.updateCommunicationWorkflowTaskStatus = async (id: string, status: string, details: any = {}) => {
    const task = workflowTasks.find((item) => item.id === id);
    if (task) {
      task.status = status;
      task.executedAt = details.executedAt ?? task.executedAt;
      task.lastError = details.lastError ?? null;
      task.attempts = details.attempts ?? task.attempts + 1;
      task.updatedAt = new Date();
    }
    return task;
  };
  storage.createCommunicationTemplateVersion = async (version: any) => {
    const existing = templateVersions.find(
      (item) => item.templateId === version.templateId && item.version === version.version,
    );
    if (existing) throw new Error("duplicate key value violates unique constraint");
    const saved = {
      id: templateVersions.length + 1,
      ...version,
      createdAt: new Date(),
      updatedAt: new Date(),
    };
    templateVersions.push(saved);
    return saved;
  };
  storage.getCommunicationTemplateVersions = async (limit = 100) => templateVersions.slice(-limit).reverse();
  storage.getCommunicationTemplateVersionsByTemplateId = async (templateId: string) =>
    templateVersions.filter((item) => item.templateId === templateId).sort((a, b) => b.version - a.version);

  try {
    const {
      emitCommunicationEvent,
      getCommunicationAiAssistance,
      getCommunicationAnalytics,
      getCommunicationDiagnostics,
      getCommunicationDocuments,
      getCommunicationTimeline,
      getCommunicationTemplates,
      getCommunicationWorkflows,
      getGeneratedDocumentPath,
      renderCommunicationTemplatePreview,
      seedCommunicationTemplateVersions,
      verifyGeneratedDocumentToken,
    } = await import("../../server/communication");

    const templates = getCommunicationTemplates();
    assert.equal(
      templates.some((template) => template.template_id === "enrollment_confirmation_document"),
      true,
    );

    const result = await emitCommunicationEvent({
      event_type: "student.enrolled",
      source: "admin",
      user_id: 100,
      payload: {
        student_name: "Test Student",
        course_name: "International Foundation",
        enrollment_status: "confirmed",
        reference_id: "ENR-100",
        event_title: "Enrollment confirmed",
        message: "Enrollment was confirmed.",
      },
    });

    assert.equal(result.status, "processed");
    assert.equal(result.documents?.length, 1);
    const document = result.documents?.[0];
    assert.ok(document?.fileName.endsWith(".pdf"));
    assert.equal(fs.existsSync(document!.filePath), true);

    const url = new URL(document!.downloadUrl, "https://example.test");
    assert.equal(
      verifyGeneratedDocumentToken(
        document!.fileName,
        url.searchParams.get("t"),
        url.searchParams.get("exp"),
      ),
      true,
    );
    assert.equal(getGeneratedDocumentPath(document!.fileName), document!.filePath);
    assert.equal(
      analyticsEvents.some((event) => event.event === "inapp_notification_created"),
      true,
    );
    assert.equal(communicationEvents.length, 1);
    assert.equal(
      communicationMessages.some((message) => message.channel === "document" && message.eventId === result.eventId),
      true,
    );
    assert.equal(communicationDocuments.some((item) => item.id === document!.documentId), true);
    assert.equal(notifications.some((item) => item.metadata?.eventId === result.eventId), true);

    const applicationResult = await emitCommunicationEvent({
      event_type: "student.application_submitted",
      source: "admin",
      user_id: 101,
      payload: {
        student_name: "Workflow Student",
        program_name: "Business Administration",
        reference_id: "APP-101",
        event_title: "Application submitted",
        message: "Application was submitted.",
      },
    });
    assert.equal(applicationResult.workflowTasks?.length, 2);
    const workflows = await getCommunicationWorkflows(20);
    assert.equal(workflows.tasks.some((task) => task.workflowId === "application_review_followup"), true);

    const preview = renderCommunicationTemplatePreview("student_enrollment_email", {
      payload: {
        student_name: "Preview Student",
        course_name: "Business Foundation",
        enrollment_status: "confirmed",
        reference_id: "PRE-100",
      },
    });
    assert.match(preview.rendered.subject, /Preview Student/);
    assert.equal(preview.variableDiagnostics.undeclared.length, 0);

    const diagnostics = getCommunicationDiagnostics();
    assert.equal(diagnostics.routes.missingTemplates.length, 0);
    assert.equal(diagnostics.providers.sms.providers.some((provider) => provider.name === "twilio_sms"), true);
    assert.equal(diagnostics.workflows.active >= 1, true);
    assert.equal(diagnostics.governance.brandFooterStandardized, true);

    const overduePreview = renderCommunicationTemplatePreview("payment_failed_email", {
      payload: {
        recipient_name: "Payment Student",
        amount: "250.00",
        currency: "USD",
        payment_status: "overdue",
        reference_id: "PAY-OVERDUE",
      },
    });
    assert.match(overduePreview.rendered.text, /Action required/);
    assert.ok(overduePreview.quality.score > 0);

    const analytics = await getCommunicationAnalytics(20);
    assert.equal(analytics.byChannel.document >= 1, true);

    const timeline = await getCommunicationTimeline({ userId: 100, limit: 20 });
    assert.equal(timeline.items.some((item) => item.event_type === "student.enrolled"), true);

    const documents = await getCommunicationDocuments(20);
    assert.equal(documents.some((item) => item.documentType === "enrollment_confirmation"), true);

    const seedResult = await seedCommunicationTemplateVersions(1);
    assert.equal(seedResult.created >= templates.length, true);
    const assistance = getCommunicationAiAssistance("payment_failed_email", {
      recipient_name: "Payment Student",
      amount: "250.00",
      currency: "USD",
      payment_status: "failed",
      reference_id: "PAY-100",
    });
    assert.equal(assistance.governanceNotes.length > 0, true);

    fs.rmSync(document!.filePath, { force: true });
    const generatedDir = path.dirname(document!.filePath);
    if (fs.existsSync(generatedDir) && fs.readdirSync(generatedDir).length === 0) {
      fs.rmdirSync(generatedDir);
    }
  } finally {
    storage.logAnalytics = originalLogAnalytics;
    storage.createCommunicationEvent = originalCreateCommunicationEvent;
    storage.updateCommunicationEventStatus = originalUpdateCommunicationEventStatus;
    storage.getCommunicationEvent = originalGetCommunicationEvent;
    storage.createCommunicationMessage = originalCreateCommunicationMessage;
    storage.getCommunicationMessages = originalGetCommunicationMessages;
    storage.createNotification = originalCreateNotification;
    storage.createCommunicationDocument = originalCreateCommunicationDocument;
    storage.getCommunicationDocuments = originalGetCommunicationDocuments;
    storage.createCommunicationWorkflowTask = originalCreateCommunicationWorkflowTask;
    storage.getCommunicationWorkflowTasks = originalGetCommunicationWorkflowTasks;
    storage.updateCommunicationWorkflowTaskStatus = originalUpdateCommunicationWorkflowTaskStatus;
    storage.createCommunicationTemplateVersion = originalCreateCommunicationTemplateVersion;
    storage.getCommunicationTemplateVersions = originalGetCommunicationTemplateVersions;
    storage.getCommunicationTemplateVersionsByTemplateId = originalGetCommunicationTemplateVersionsByTemplateId;
  }
});
