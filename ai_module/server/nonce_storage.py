# Global nonce storage for internal communication
_server_nonce = None

def set_nonce(nonce_value):
    global _server_nonce
    _server_nonce = nonce_value

def get_nonce():
    return _server_nonce
