#include <libproc.h>
#include <limits.h>
#include <stdlib.h>
#include <string.h>

int main(int argc, char **argv) {
    if (argc != 3) return 1;

    char *end;
    long pid = strtol(argv[1], &end, 10);
    if (*end != '\0' || pid <= 1 || pid > INT_MAX) return 1;

    char executable[PROC_PIDPATHINFO_MAXSIZE];
    char actual[PATH_MAX];
    char expected[PATH_MAX];
    if (proc_pidpath((int)pid, executable, sizeof(executable)) <= 0 ||
        !realpath(executable, actual) || !realpath(argv[2], expected)) return 1;

    return strcmp(actual, expected) != 0;
}
