import express from 'express';
import { getTeamMembers, getTeamMember, addTeamMember, updateTeamMember, deleteTeamMember, payoutSalary, getTeamMemberSalaryHistory, getTeamMemberAccount, distributeSalary, autoDistributeSalaries } from '../controllers/teamController';
import { authMiddleware } from '../middleware/authMiddleware';

const router = express.Router();

router.get('/', authMiddleware, getTeamMembers);
router.get('/:id', authMiddleware, getTeamMember);
router.get('/:id/account', authMiddleware, getTeamMemberAccount);
router.get('/:id/salary-history', authMiddleware, getTeamMemberSalaryHistory);
router.post('/', authMiddleware, addTeamMember);
router.post('/salary-payout', authMiddleware, payoutSalary);
router.post('/distribute-salary', authMiddleware, distributeSalary);
router.post('/auto-distribute', authMiddleware, autoDistributeSalaries);
router.put('/:id', authMiddleware, updateTeamMember);
router.delete('/:id', authMiddleware, deleteTeamMember);

export default router;
