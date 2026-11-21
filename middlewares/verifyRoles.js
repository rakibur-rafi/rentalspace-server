const verifyRole = (allowedRoles) => {
    return (req, res, next) => {
        if (!req.user) {
            return res.status(401).send({
                message: "Unauthorized"
            });
        }

        if (!allowedRoles.includes(req.user.role)) {
            return res.status(403).send({
                message: "You do not have permission for this"
            });
        }

        next();
    };
};

export const requireCustomer = verifyRole(["customer"]);
export const requireAdmin = verifyRole(["admin"]);
export const requireOwner = verifyRole(["owner"]);