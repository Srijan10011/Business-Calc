"use strict";
var __awaiter = (this && this.__awaiter) || function (thisArg, _arguments, P, generator) {
    function adopt(value) { return value instanceof P ? value : new P(function (resolve) { resolve(value); }); }
    return new (P || (P = Promise))(function (resolve, reject) {
        function fulfilled(value) { try { step(generator.next(value)); } catch (e) { reject(e); } }
        function rejected(value) { try { step(generator["throw"](value)); } catch (e) { reject(e); } }
        function step(result) { result.done ? resolve(result.value) : adopt(result.value).then(fulfilled, rejected); }
        step((generator = generator.apply(thisArg, _arguments || [])).next());
    });
};
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.setupBusiness = exports.login = exports.register = exports.checkBusiness = void 0;
const bcryptjs_1 = __importDefault(require("bcryptjs"));
const jsonwebtoken_1 = __importDefault(require("jsonwebtoken"));
const db_1 = __importDefault(require("../db"));
const accountController_1 = require("./accountController");
// Check if business exists
const checkBusiness = (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    const { business_id } = req.params;
    try {
        const business = yield db_1.default.query('SELECT business_id, name, currency FROM businesses WHERE business_id = $1', [business_id]);
        if (business.rows.length === 0) {
            return res.status(404).json({ msg: 'Business not found' });
        }
        res.json({
            exists: true,
            business: business.rows[0]
        });
    }
    catch (err) {
        console.error(err.message);
        res.status(500).send('Server error');
    }
});
exports.checkBusiness = checkBusiness;
const register = (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    const { name, email, password, business_id } = req.body;
    const client = yield db_1.default.connect();
    try {
        yield client.query('BEGIN');
        const user = yield client.query('SELECT * FROM users WHERE email = $1', [email]);
        if (user.rows.length > 0) {
            yield client.query('ROLLBACK');
            return res.status(400).json({ msg: 'User already exists' });
        }
        let finalBusinessId = business_id;
        let needsBusinessSetup = false;
        // If business_id provided, validate it exists
        if (business_id) {
            const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
            if (!uuidRegex.test(business_id)) {
                yield client.query('ROLLBACK');
                return res.status(400).json({ msg: 'Invalid business ID format' });
            }
            const businessExists = yield client.query('SELECT business_id FROM businesses WHERE business_id = $1', [business_id]);
            if (businessExists.rows.length === 0) {
                yield client.query('ROLLBACK');
                return res.status(400).json({ msg: 'Business not found' });
            }
        }
        else {
            // No business_id provided - user will need to set up business later
            needsBusinessSetup = true;
            finalBusinessId = null;
        }
        const salt = yield bcryptjs_1.default.genSalt(10);
        const hashedPassword = yield bcryptjs_1.default.hash(password, salt);
        const newUser = yield client.query('INSERT INTO users (name, email, password_hash) VALUES ($1, $2, $3) RETURNING user_id, name, email, created_at', [name, email, hashedPassword]);
        const user_id = newUser.rows[0].user_id;
        // Link user to business only if business_id was provided
        if (finalBusinessId) {
            yield client.query('INSERT INTO business_users (user_id, business_id) VALUES ($1, $2)', [user_id, finalBusinessId]);
        }
        yield client.query('COMMIT');
        const payload = {
            user: {
                id: user_id
            }
        };
        jsonwebtoken_1.default.sign(payload, process.env.JWT_SECRET, { expiresIn: 360000 }, (err, token) => {
            if (err)
                throw err;
            res.json({
                token,
                needsBusinessSetup
            });
        });
    }
    catch (err) {
        yield client.query('ROLLBACK');
        console.error(err.message);
        res.status(500).send('Server error');
    }
    finally {
        client.release();
    }
});
exports.register = register;
const login = (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    const { email, password } = req.body;
    try {
        console.log('=== LOGIN ATTEMPT ===');
        console.log('Email:', email);
        const user = yield db_1.default.query('SELECT * FROM users WHERE email = $1', [email]);
        if (user.rows.length === 0) {
            console.log('User not found');
            return res.status(400).json({ msg: 'Invalid Credentials' });
        }
        console.log('User found:', user.rows[0].user_id, user.rows[0].name);
        const isMatch = yield bcryptjs_1.default.compare(password, user.rows[0].password_hash);
        if (!isMatch) {
            console.log('Password mismatch');
            return res.status(400).json({ msg: 'Invalid Credentials' });
        }
        const payload = {
            user: {
                id: user.rows[0].user_id
            }
        };
        console.log('Creating JWT for user:', user.rows[0].user_id);
        jsonwebtoken_1.default.sign(payload, process.env.JWT_SECRET, { expiresIn: 3600 }, (err, token) => __awaiter(void 0, void 0, void 0, function* () {
            if (err)
                throw err;
            console.log('=== LOGIN SUCCESS ===');
            console.log('JWT created for user ID:', user.rows[0].user_id);
            console.log('User name:', user.rows[0].name);
            console.log('User email:', user.rows[0].email);
            console.log('Token (first 50 chars):', (token === null || token === void 0 ? void 0 : token.substring(0, 50)) + '...');
            // Check if user needs business setup
            const businessCheck = yield db_1.default.query('SELECT business_id FROM business_users WHERE user_id = $1', [user.rows[0].user_id]);
            const needsBusinessSetup = businessCheck.rows.length === 0;
            console.log('Needs business setup:', needsBusinessSetup);
            res.json({
                token,
                needsBusinessSetup
            });
        }));
    }
    catch (err) {
        console.error(err.message);
        res.status(500).send('Server error');
    }
});
exports.login = login;
const setupBusiness = (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    var _a;
    const { businessName, currency } = req.body;
    const user_id = (_a = req.user) === null || _a === void 0 ? void 0 : _a.id;
    try {
        if (!businessName || !currency) {
            return res.status(400).json({ msg: 'Business name and currency are required' });
        }
        // Create new business
        const newBusiness = yield db_1.default.query('INSERT INTO businesses (name, currency) VALUES ($1, $2) RETURNING business_id, name, currency', [businessName, currency]);
        const business_id = newBusiness.rows[0].business_id;
        // Add to business_users table (no role column in schema)
        yield db_1.default.query('INSERT INTO business_users (user_id, business_id) VALUES ($1, $2)', [user_id, business_id]);
        // Create default accounts for the new business
        yield (0, accountController_1.createDefaultAccounts)(business_id);
        console.log('Business setup completed for user:', user_id, 'Business:', business_id);
        res.json({
            msg: 'Business setup completed',
            business: newBusiness.rows[0]
        });
    }
    catch (err) {
        console.error('Business setup error:', err.message);
        res.status(500).send('Server error');
    }
});
exports.setupBusiness = setupBusiness;
