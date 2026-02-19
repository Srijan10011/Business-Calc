import express from 'express';
import { getTeamMembers, getTeamMember, addTeamMember, updateTeamMember, deleteTeamMember, payoutSalary, getTeamMemberSalaryHistory, getTeamMemberAccount, distributeSalary, autoDistributeSalaries } from '../controllers/teamController';
import { authMiddleware } from '../middleware/authMiddleware';
import { loadPermissions, requirePermission } from '../middleware/permissionMiddleware';
import { validateRequest } from '../middleware/validateRequest';
import { addTeamMemberSchema, updateTeamMemberSchema, salaryPayoutSchema, distributeSalarySchema } from '../validators';

const router = express.Router();

router.get('/', authMiddleware, loadPermissions, requirePermission('team.view'), getTeamMembers);
router.get('/:id', authMiddleware, loadPermissions, requirePermission('team.view'), getTeamMember);
router.get('/:id/account', authMiddleware, loadPermissions, requirePermission('team.view'), getTeamMemberAccount);
router.get('/:id/salary-history', authMiddleware, loadPermissions, requirePermission('team.view'), getTeamMemberSalaryHistory);
router.post('/', authMiddleware, loadPermissions, requirePermission('team.manage'), validateRequest(addTeamMemberSchema), addTeamMember);
router.post('/salary-payout', authMiddleware, loadPermissions, requirePermission('team.manage'), validateRequest(salaryPayoutSchema), payoutSalary);
router.post('/distribute-salary', authMiddleware, loadPermissions, requirePermission('team.manage'), validateRequest(distributeSalarySchema), distributeSalary);
router.post('/auto-distribute', authMiddleware, loadPermissions, requirePermission('team.manage'), autoDistributeSalaries);
router.put('/:id', authMiddleware, loadPermissions, requirePermission('team.manage'), validateRequest(updateTeamMemberSchema), updateTeamMember);
router.delete('/:id', authMiddleware, loadPermissions, requirePermission('team.manage'), deleteTeamMember);

export default router;
