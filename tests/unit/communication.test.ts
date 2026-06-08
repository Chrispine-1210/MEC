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

test("communication event dispatch generates documents and audit records", async () => {
  const { storage } = await import("../../server/storage");
  const originalLogAnalytics = storage.logAnalytics.bind(storage);
  const originalCreateCommunicationEvent = storage.createCommunicationEvent.bind(storage);
  const originalUpdateCommunicationEventStatus = storage.updateCommunicationEventStatus.bind(storage);
  const originalGetCommunicationEvent = storage.getCommunicationEvent.bind(storage);
  const originalCreateCommunicationMessage = storage.createCommunicationMessage.bind(storage);
  const originalGetCommunicationMessages = storage.getCommunicationMessages.bind(storage);
  const analyticsEvents: any[] = [];
  const communicationEvents: any[] = [];
  const communicationMessages: any[] = [];
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

  try {
    const {
      emitCommunicationEvent,
      getCommunicationAnalytics,
      getCommunicationDiagnostics,
      getCommunicationTimeline,
      getCommunicationTemplates,
      getGeneratedDocumentPath,
      renderCommunicationTemplatePreview,
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
  }
});
