import express from 'express';
import { getTeamMembers, getTeamMember, addTeamMember, updateTeamMember, deleteTeamMember, payoutSalary, getTeamMemberSalaryHistory, getTeamMemberAccount, distributeSalary, autoDistributeSalaries } from '../controllers/teamController';
import { authMiddleware } from '../middleware/authMiddleware';
import { loadPermissions, requirePermission } from '../middleware/permissionMiddleware';
import { validateRequest } from '../middleware/validateRequest';
import { addTeamMemberSchema, updateTeamMemberSchema, salaryPayoutSchema, distributeSalarySchema } from '../validators';
import { loadUserBusiness } from '../middleware/loadUserBusiness';

const router = express.Router();

router.get('/', authMiddleware, loadUserBusiness, loadPermissions, requirePermission('team.view'), getTeamMembers);
router.get('/:id', authMiddleware, loadUserBusiness, loadPermissions, requirePermission('team.view'), getTeamMember);
router.get('/:id/account', authMiddleware, loadUserBusiness, loadPermissions, requirePermission('team.view'), getTeamMemberAccount);
router.get('/:id/salary-history', authMiddleware, loadUserBusiness, loadPermissions, requirePermission('team.view'), getTeamMemberSalaryHistory);
router.post('/', authMiddleware, loadUserBusiness, loadPermissions, requirePermission('team.manage'), validateRequest(addTeamMemberSchema), addTeamMember);
router.post('/salary-payout', authMiddleware, loadUserBusiness, loadPermissions, requirePermission('team.manage'), validateRequest(salaryPayoutSchema), payoutSalary);
router.post('/distribute-salary', authMiddleware, loadUserBusiness, loadPermissions, requirePermission('team.manage'), validateRequest(distributeSalarySchema), distributeSalary);
router.post('/auto-distribute', authMiddleware, loadPermissions, requirePermission('team.manage'), autoDistributeSalaries);
router.put('/:id', authMiddleware, loadUserBusiness, loadPermissions, requirePermission('team.manage'), validateRequest(updateTeamMemberSchema), updateTeamMember);
router.delete('/:id', authMiddleware, loadUserBusiness, loadPermissions, requirePermission('team.manage'), deleteTeamMember);

export default router;
