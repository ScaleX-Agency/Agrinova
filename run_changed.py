import subprocess 
 
result = subprocess.run( 
    ["git", "diff", "--name-only", "HEAD~1", "HEAD"], 
    capture_output=True, 
    text=True, 
) 
 
changed = result.stdout.splitlines() 
test_files = [f for f in changed if f.startswith("tests/e2e/") and f.endswith(".py")] 
 
if not test_files: 
    print("No changed e2e files. Running last failed tests.") 
    subprocess.run(["pytest", "--lf"]) 
else: 
    print("Running changed test files:") 
    for file in test_files: 
        print(file) 
        subprocess.run(["pytest", file]) 
