import subprocess
from setuptools import setup, find_packages

def download_nltk_data():
    subprocess.call(['python', '-m', 'nltk.downloader', 'punkt', 'averaged_perceptron_tagger'])

setup(
    name='MAGE-Finetune',
    version='0.1',
    packages=find_packages(),
    install_requires=[
        # List requirements here
    ],
    entry_points={
        'console_scripts': [
            'download-nltk-data=setup:download_nltk_data',
        ],
    },
)
