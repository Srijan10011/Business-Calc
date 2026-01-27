"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = require("express");
const accountController_1 = require("../controllers/accountController");
const authMiddleware_1 = require("../middleware/authMiddleware");
const router = (0, express_1.Router)();
router.get('/', authMiddleware_1.authMiddleware, accountController_1.getAccounts);
router.get('/transactions', authMiddleware_1.authMiddleware, accountController_1.getTransactions);
exports.default = router;
