"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = require("express");
const productCostRuleController_1 = require("../controllers/productCostRuleController");
const authMiddleware_1 = require("../middleware/authMiddleware");
const router = (0, express_1.Router)();
router.post('/', authMiddleware_1.authMiddleware, productCostRuleController_1.addProductCostRule);
exports.default = router;
