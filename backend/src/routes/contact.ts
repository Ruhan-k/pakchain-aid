import { Router, Request, Response } from 'express';
import { sendContactEmail } from '../services/email';

const router = Router();

interface ContactFormData {
  name: string;
  email: string;
  subject: string;
  message: string;
}

/**
 * POST /api/contact
 * Handle contact form submissions
 */
router.post('/', async (req: Request, res: Response) => {
  try {
    const { name, email, subject, message }: ContactFormData = req.body;

    // Validation
    if (!name || !email || !subject || !message) {
      return res.status(400).json({
        message: 'All fields are required',
        code: 'VALIDATION_ERROR',
      });
    }

    // Validate email format
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(email)) {
      return res.status(400).json({
        message: 'Invalid email format',
        code: 'VALIDATION_ERROR',
      });
    }

    // Validate minimum message length
    if (message.trim().length < 10) {
      return res.status(400).json({
        message: 'Message must be at least 10 characters long',
        code: 'VALIDATION_ERROR',
      });
    }

    // Sanitize inputs (basic sanitization)
    const sanitizedName = name.trim().substring(0, 200);
    const sanitizedEmail = email.trim().substring(0, 200);
    const sanitizedSubject = subject.trim().substring(0, 200);
    const sanitizedMessage = message.trim().substring(0, 5000);

    // Send email
    await sendContactEmail(sanitizedName, sanitizedEmail, sanitizedSubject, sanitizedMessage);

    res.status(200).json({
      message: 'Contact form submitted successfully',
      code: 'SUCCESS',
    });
  } catch (error) {
    console.error('Error processing contact form:', error);
    res.status(500).json({
      message: error instanceof Error ? error.message : 'Failed to process contact form',
      code: 'INTERNAL_ERROR',
    });
  }
});

export { router as contactRoutes };

