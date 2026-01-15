"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = require("express");
const customerController_1 = require("../controllers/customerController");
const authMiddleware_1 = require("../middleware/authMiddleware");
const router = (0, express_1.Router)();
router.get('/', authMiddleware_1.authMiddleware, customerController_1.getCustomers);
router.post('/', authMiddleware_1.authMiddleware, customerController_1.addCustomer);
exports.default = router;
