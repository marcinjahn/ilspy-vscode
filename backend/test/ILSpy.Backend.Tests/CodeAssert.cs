namespace ILSpy.Backend.Tests;

public static class CodeAssert
{
    public static void Equal(string? expected, string? actual)
    {
        Assert.Equal(expected?.ReplaceLineEndings(), actual);
    }
}

