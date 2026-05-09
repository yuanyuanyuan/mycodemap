def regular():
    pass

async def async_func():
    pass

@decorator
def decorated():
    pass

def typed(x: int) -> str:
    return str(x)

def defaulted(x=5):
    pass

def outer():
    def inner():
        pass
    return inner
