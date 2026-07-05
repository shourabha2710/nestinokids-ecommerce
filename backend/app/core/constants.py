class AuditAction:
    CREATE = "CREATE"
    UPDATE = "UPDATE"
    DELETE = "DELETE"
    LOGIN = "LOGIN"
    STATUS_CHANGE = "STATUS_CHANGE"


class AuditEntityType:
    PRODUCT = "PRODUCT"
    ORDER = "ORDER"
    INVENTORY = "INVENTORY"
    USER = "USER"
