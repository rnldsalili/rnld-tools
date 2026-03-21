import { PermissionAction, PermissionModule } from '@workspace/permissions';
import {
  createLoanAttachment,
  deleteLoanAttachment,
  downloadLoanAttachment,
  getLoanAttachments,
} from './attachments.handler';
import { createRouter } from '@/api/app';
import { authorize } from '@/api/middlewares/authorization.middleware';

const loanAttachmentsRoute = createRouter()
  .get('/', authorize(PermissionModule.LOANS, PermissionAction.VIEW), ...getLoanAttachments)
  .post('/', authorize(PermissionModule.LOANS, PermissionAction.UPDATE), ...createLoanAttachment)
  .get('/:attachmentId/download', authorize(PermissionModule.LOANS, PermissionAction.VIEW), ...downloadLoanAttachment)
  .delete('/:attachmentId', authorize(PermissionModule.LOANS, PermissionAction.UPDATE), ...deleteLoanAttachment);

export default loanAttachmentsRoute;
