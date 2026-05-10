from typing import Optional


class Client:
    """Client settings.

    Attributes:
        timeout (int): Request timeout in seconds.
    """

    timeout: int = 30


def build_client(name, alias: Optional[str] = None) -> list[Client]:
    """Build a client list.

    Args:
        name (str): Display name.
        alias (str): Optional alias from the docstring, but the annotation should win.

    Returns:
        Client: Returned client instance from legacy docs.
    """

    return [Client()]
