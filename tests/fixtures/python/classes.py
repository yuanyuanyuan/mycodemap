class Foo:
    pass

class Foo(Bar):
    pass

class Foo(Bar, Baz):
    pass

@decorator
class DecoratedClass:
    pass

class Outer:
    class Inner:
        pass
    def method(self):
        pass
