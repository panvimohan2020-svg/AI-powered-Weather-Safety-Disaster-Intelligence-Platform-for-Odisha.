import os
import sys
import unittest

# Ensure working directory and sys.path point to the Odisha-WRI root
parent_dir = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
os.chdir(parent_dir)
if parent_dir not in sys.path:
    sys.path.insert(0, parent_dir)

import test_system_verification

if __name__ == '__main__':
    suite = unittest.defaultTestLoader.loadTestsFromModule(test_system_verification)
    runner = unittest.TextTestRunner(verbosity=2)
    result = runner.run(suite)
    sys.exit(not result.wasSuccessful())
