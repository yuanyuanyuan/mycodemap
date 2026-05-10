class UserDirectory:
    """Directory metadata.

    Attributes
    ----------
    retries : int
        Retry budget for the directory.
    """

    retries = 3


def load_users(limit) -> list[UserDirectory]:
    """Load users from the directory.

    Parameters
    ----------
    limit : int
        Maximum number of users to load.

    Returns
    -------
    list[UserDirectory]
        Loaded user directories.
    """

    return [UserDirectory()]
